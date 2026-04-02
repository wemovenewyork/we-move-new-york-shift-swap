import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
async function main() {
  const r = await prisma.user.updateMany({ where: { verified: false }, data: { verified: true } });
  console.log("Updated:", r.count, "users");
}
main().finally(() => prisma.$disconnect());
