import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/apiResponse";

// POST /api/users/me/flexible → toggle flexible mode on/off
export async function POST(req: NextRequest) {
  let user;
  try { user = requireUser(req); } catch { return err("Unauthorized", 401); }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return err("User not found", 404);

  const newMode = !dbUser.flexibleMode;
  const updated = await prisma.user.update({
    where: { id: user.userId },
    data: {
      flexibleMode: newMode,
      flexibleSince: newMode ? new Date() : null,
    },
  });

  return ok({ flexibleMode: updated.flexibleMode });
}
