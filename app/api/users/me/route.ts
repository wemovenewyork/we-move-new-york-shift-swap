import { NextRequest, NextResponse } from "next/server";
import { requireUser, checkActive } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/reputation";
import { ok, err } from "@/lib/apiResponse";
import { parseBody, BODY_200KB } from "@/lib/parseBody";

export async function GET(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { depot: true },
  });
  if (!dbUser) return err("User not found", 404);

  // Block suspended or soft-deleted accounts from reading their own profile.
  // Without this, the UI's auth-context would think they're logged in even
  // though they shouldn't be able to use any other endpoint.
  const activeErr = checkActive(dbUser);
  if (activeErr) return err(activeErr, 403);

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
    verifiedOperator: dbUser.verifiedOperator,
  });
}

export async function PUT(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const body = await parseBody(req, BODY_200KB);
  if (body instanceof NextResponse) return body;
  const { firstName, lastName, email, language, depotId, jobTitle, avatarUrl } = body as {
    firstName?: string; lastName?: string; email?: string; language?: string;
    depotId?: string; jobTitle?: string; avatarUrl?: string;
  };

  const callerUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { email: true, suspendedUntil: true } });
  if (!callerUser) return err("User not found", 404);
  const activeErr = checkActive(callerUser);
  if (activeErr) return err(activeErr, 403);

  if (firstName && firstName.trim().length > 50) return err("First name must be 50 characters or fewer", 400);
  if (lastName && lastName.trim().length > 50) return err("Last name must be 50 characters or fewer", 400);
  if (email && email.trim().length > 254) return err("Email must be 254 characters or fewer", 400);
  if (language && language.length > 10) return err("Invalid language value", 400);
  if (jobTitle && jobTitle.length > 100) return err("Job title must be 100 characters or fewer", 400);

  // Validate avatarUrl — allow base64 data URLs (from client-side canvas resize) or HTTPS URLs
  if (avatarUrl !== undefined && avatarUrl !== null) {
    if (avatarUrl.startsWith("data:image/")) {
      if (avatarUrl.length > 200_000) return err("Avatar image too large", 400);
    } else {
      try {
        const parsed = new URL(avatarUrl);
        if (parsed.protocol !== "https:") return err("Avatar URL must use HTTPS", 400);
        const host = parsed.hostname.toLowerCase();
        // Block private/internal address ranges. Avatar URLs are loaded by
        // viewers' browsers, so this isn't strict server-side SSRF — but
        // linking to internal hosts can leak through referer headers and
        // produces broken UX, so reject.
        const blockedExact = new Set(["localhost", "0.0.0.0", "::", "::1"]);
        const blockedPrefixes = [
          "127.",         // IPv4 loopback
          "10.",          // RFC1918 /8
          "192.168.",     // RFC1918 /16
          "169.254.",     // link-local
          "fe80:",        // IPv6 link-local
          "fc00:", "fd",  // IPv6 unique-local
        ];
        let blocked = blockedExact.has(host);
        if (!blocked) {
          // 172.16.0.0/12 covers 172.16. through 172.31.
          const m = host.match(/^172\.(\d+)\./);
          if (m && parseInt(m[1], 10) >= 16 && parseInt(m[1], 10) <= 31) blocked = true;
        }
        if (!blocked && blockedPrefixes.some(p => host.startsWith(p))) blocked = true;
        if (blocked) return err("Invalid avatar URL", 400);
      } catch {
        return err("Invalid avatar URL", 400);
      }
    }
  }

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
      ...(avatarUrl !== undefined && { avatarUrl }),
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
