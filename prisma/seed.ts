import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEPOTS = [
  { name: "Baisley Park Depot", code: "BP", borough: "Queens", operator: "MTA Bus" },
  { name: "Casey Stengel Depot", code: "CS", borough: "Queens", operator: "NYCT" },
  { name: "Castleton Depot", code: "CA", borough: "Staten Island", operator: "NYCT" },
  { name: "Charleston Depot", code: "CH", borough: "Staten Island", operator: "NYCT" },
  { name: "College Point Depot", code: "CP", borough: "Queens", operator: "MTA Bus" },
  { name: "East New York Depot", code: "EN", borough: "Brooklyn", operator: "NYCT" },
  { name: "Eastchester Depot", code: "EC", borough: "Bronx", operator: "MTA Bus" },
  { name: "Far Rockaway Depot", code: "FR", borough: "Queens", operator: "MTA Bus" },
  { name: "Flatbush Depot", code: "FB", borough: "Brooklyn", operator: "NYCT" },
  { name: "Fresh Pond Depot", code: "FP", borough: "Brooklyn", operator: "NYCT" },
  { name: "Grand Avenue Depot", code: "GA", borough: "Brooklyn", operator: "NYCT" },
  { name: "Gun Hill Depot", code: "GH", borough: "Bronx", operator: "MaBSTOA" },
  { name: "Jackie Gleason Depot", code: "JG", borough: "Brooklyn", operator: "NYCT" },
  { name: "Jamaica Depot", code: "JA", borough: "Queens", operator: "NYCT" },
  { name: "JFK Depot", code: "JF", borough: "Queens", operator: "MTA Bus" },
  { name: "Kingsbridge Depot", code: "KB", borough: "Bronx", operator: "MaBSTOA" },
  { name: "LaGuardia Depot", code: "LG", borough: "Queens", operator: "MTA Bus" },
  { name: "Manhattanville Depot", code: "MV", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Meredith Depot", code: "ME", borough: "Staten Island", operator: "NYCT" },
  { name: "Michael J. Quill Depot", code: "MQ", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Mother Clara Hale Depot", code: "MC", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Queens Village Depot", code: "QV", borough: "Queens", operator: "NYCT" },
  { name: "Spring Creek Depot", code: "SC", borough: "Brooklyn", operator: "MTA Bus" },
  { name: "Tuskegee Airmen Depot", code: "TA", borough: "Manhattan", operator: "MaBSTOA" },
  { name: "Ulmer Park Depot", code: "UP", borough: "Brooklyn", operator: "NYCT" },
  { name: "West Farms Depot", code: "WF", borough: "Bronx", operator: "MaBSTOA" },
  { name: "Yonkers Depot", code: "YK", borough: "Bronx", operator: "MTA Bus" },
  { name: "Yukon Depot", code: "YU", borough: "Staten Island", operator: "NYCT" },
];

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "WMNY-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function main() {
  console.log("Seeding depots...");
  for (const d of DEPOTS) {
    await prisma.depot.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }

  console.log("Seeding seed invite codes...");
  // Create a system user to own seed codes
  const systemUser = await prisma.user.upsert({
    where: { email: "system@wemoveny.internal" },
    update: {},
    create: {
      email: "system@wemoveny.internal",
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
      firstName: "System",
      lastName: "Admin",
      verified: true,
    },
  });

  const seedCodes = ["WMNY-2024A", "WMNY-2024B", "WMNY-2024C"];
  for (const code of seedCodes) {
    await prisma.inviteCode.upsert({
      where: { code },
      update: {},
      create: { code, createdBy: systemUser.id, isValid: true },
    });
  }

  console.log("Seeding admin account...");
  const adminHash = await bcrypt.hash("WMNYshiftswap0334", 10);
  await prisma.user.upsert({
    where: { email: "wemovenewyork.net@gmail.com" },
    update: {},
    create: {
      email: "wemovenewyork.net@gmail.com",
      passwordHash: adminHash,
      firstName: "Admin",
      lastName: "WeMoveNY",
      verified: true,
      role: "admin",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
